import Link from "next/link";

export default function ThankYouPage({ params }: { params: { slug: string } }) {
  return (
    <main className="page page--narrow">
      <div className="empty-state">
        <h1>Thanks!</h1>
        <p>Your response has been recorded.</p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: "1rem" }}>
          <Link className="btn" href={`/f/${params.slug}`}>
            Submit another response
          </Link>
        </div>
      </div>
    </main>
  );
}
