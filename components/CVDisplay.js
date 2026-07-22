import { Card } from "@/components/ui/card";

export function CVDisplay({ cvData }) {
  const { summary, experience, education, projects, achievements } = cvData;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Professional Summary */}
      {summary && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Professional Summary
          </h2>
          <ul className="list-disc ml-5 space-y-1">
            <li className="text-sm text-slate-700 leading-relaxed">{summary}</li>
          </ul>
        </Card>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4 border-b border-slate-200 pb-2">
            Experience
          </h2>
          <div className="space-y-6">
            {experience.map((job, index) => (
              <div key={index}>
                <h3 className="text-lg font-semibold text-slate-900">{job.job_title}</h3>
                <p className="text-sm font-medium text-slate-600 mb-1">{job.company}</p>
                <p className="text-xs text-slate-500 mb-3">{job.dates}</p>
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <ul className="list-disc ml-5 space-y-1">
                    {job.responsibilities.map((resp, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        {resp}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Education
          </h2>
          <ul className="list-disc ml-5 space-y-1">
            {education.map((edu, index) => (
              <li key={index} className="text-sm text-slate-700">
                {edu}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Projects
          </h2>
          <ul className="list-disc ml-5 space-y-1">
            {projects.map((project, index) => (
              <li key={index} className="text-sm text-slate-700">
                {project}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">
            Achievements
          </h2>
          <ul className="list-disc ml-5 space-y-1">
            {achievements.map((item, index) => (
              <li key={index} className="text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

    </div>
  );
}
