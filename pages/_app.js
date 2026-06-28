import "@/styles/globals.css";
import { PartnerMapProvider } from "../lib/PartnerMapContext";
import { NoticeCountProvider } from "../lib/NoticeCountContext";

export default function App({ Component, pageProps }) {
  return (
    <PartnerMapProvider>
      <NoticeCountProvider>
        <div className="ui-app-backdrop min-h-screen">
          <Component {...pageProps} />
        </div>
      </NoticeCountProvider>
    </PartnerMapProvider>
  );
}
