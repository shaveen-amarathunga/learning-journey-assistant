export default function Home() {
  const masteryScores = [
    { code: "LO1", name: "Problem Solving", score: 85 },
    { code: "LO2", name: "Programming", score: 72 },
    { code: "LO3", name: "Data Analysis", score: 91 },
    { code: "LO4", name: "Communication", score: 68 },
  ];

  return (
    <main className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-900">
            Learning Journey Assistant
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Student Performance Dashboard
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Student */}
        <section className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <p className="text-sm text-slate-500">Student</p>

          <h2 className="text-2xl font-semibold text-slate-900 mt-1">
            Alex Johnson
          </h2>

          <p className="text-slate-500 mt-1">
            Student ID: S001
          </p>
        </section>

        {/* Overall mastery */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Overall Performance
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-slate-500">
              Overall Mastery
            </p>

            <p className="text-4xl font-bold text-slate-900 mt-2">
              79%
            </p>

            <p className="text-sm text-slate-600 mt-2">
              Good progress — some areas need improvement.
            </p>
          </div>
        </section>

        {/* Learning outcomes */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Learning Outcome Mastery
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {masteryScores.map((item) => (
              <div
                key={item.code}
                className="bg-white rounded-xl border border-slate-200 p-6"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.code}
                    </p>

                    <p className="text-sm text-slate-500">
                      {item.name}
                    </p>
                  </div>

                  <p className="text-2xl font-bold text-slate-900">
                    {item.score}%
                  </p>
                </div>

                {/* Mastery bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 mt-5">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feedback */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Recent Feedback
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="font-medium text-slate-900">
              Focus Area
            </p>

            <p className="text-slate-600 mt-2">
              Continue improving your understanding of LO4. Review recent
              assessment feedback and practise the areas where your mastery
              score is lower.
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}