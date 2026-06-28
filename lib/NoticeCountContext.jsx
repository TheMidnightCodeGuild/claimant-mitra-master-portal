import { createContext, useContext, useEffect, useState, useCallback } from "react";

const NOTICE_REFRESH_MS = 2 * 60 * 1000;

const NoticeCountContext = createContext({
  noticeCount: 0,
  refreshNoticeCount: () => {},
});

async function fetchNoticeCountFromApi() {
  const res = await fetch("/api/cache/notice-count", { credentials: "include" });
  if (!res.ok) return 0;
  const json = await res.json();
  return json.count ?? 0;
}

export function NoticeCountProvider({ children }) {
  const [noticeCount, setNoticeCount] = useState(0);

  const refreshNoticeCount = useCallback(async () => {
    try {
      const count = await fetchNoticeCountFromApi();
      setNoticeCount(count);
    } catch (err) {
      console.error("Failed to load notice count:", err);
    }
  }, []);

  useEffect(() => {
    refreshNoticeCount();
    const id = setInterval(refreshNoticeCount, NOTICE_REFRESH_MS);
    return () => clearInterval(id);
  }, [refreshNoticeCount]);

  return (
    <NoticeCountContext.Provider value={{ noticeCount, refreshNoticeCount }}>
      {children}
    </NoticeCountContext.Provider>
  );
}

export function useNoticeCount() {
  return useContext(NoticeCountContext);
}

export default NoticeCountContext;
