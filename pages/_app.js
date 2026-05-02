import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <div className="ui-app-backdrop min-h-screen">
      <Component {...pageProps} />
    </div>
  );
}
