// The interactive app is the static offline bundle in /public/offside.
// next.config.mjs redirects "/" -> "/offside/index.html". This is only a fallback link.
export default function Home() {
  return (
    <main>
      <h1>OFFSIDE</h1>
      <p>
        Open the app: <a href="/offside/index.html">/offside/index.html</a>
      </p>
    </main>
  );
}
