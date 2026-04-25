export default function ProtectedHomePage() {
  return (
    <section className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Home</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        You are logged in
      </h2>
      <p className="mt-3 text-sm text-slate-600">
        This page is rendered inside the post-authenticated layout.
      </p>
    </section>
  );
}
