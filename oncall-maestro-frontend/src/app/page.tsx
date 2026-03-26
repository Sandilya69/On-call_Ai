export default function Home() {
  // Opening page: आगे user auth के हिसाब से `/login` या `/dashboard` redirect होगा।
  // अभी सिर्फ structure scaffolding के लिए placeholder दिखाया जा रहा है।
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Opening Page (placeholder)</h1>
      <p style={{ marginTop: 8, color: "#94a3b8" }}>
        Next step: auth check के बाद redirect (`/login` या `/dashboard`)
      </p>
    </div>
  );
}
