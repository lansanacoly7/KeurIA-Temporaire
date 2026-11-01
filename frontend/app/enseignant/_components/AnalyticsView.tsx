"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, GraduationCap, HandHelping, Printer, School, Star, TrendingUp, TriangleAlert } from "lucide-react";
import {
  getClassAnalytics, listTeacherClasses, WEAK_SCORE_THRESHOLD, type ClassAnalytics, type TeacherClassRow,
} from "@/app/_scolaire/lib/enseignantApi";
import { plural } from "@/app/_scolaire/lib/format";
import { className } from "@/app/_scolaire/lib/levels";
import { useApi } from "@/app/_scolaire/lib/useApi";
import { ColumnChart, HBarChart } from "@/app/_scolaire/ui/charts";
import { Badge, DataTable, EmptyState, ErrorMessage, PageHeader, Skeleton, StatCard } from "@/app/_scolaire/ui/ui";

function percent(value: number | null): string {
  return value === null ? "—" : `${value} %`;
}

function GlobalReport({ classes, onSelectClass }: { classes: TeacherClassRow[]; onSelectClass: (id: string) => void }) {
  const [allAnalytics, setAllAnalytics] = useState<ClassAnalytics[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all(classes.map(c => getClassAnalytics(c.classroom.id)))
      .then(res => { if (active) { setAllAnalytics(res); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [classes]);

  if (loading || !allAnalytics) return <Skeleton height={300} />;

  const totalStudents = allAnalytics.reduce((acc, c) => acc + c.studentCount, 0);
  const totalNeedingHelp = allAnalytics.reduce((acc, c) => acc + c.studentsNeedingHelp, 0);

  const scores = allAnalytics.map(c => c.averageScore).filter((s): s is number => s !== null);
  const globalAvgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const onTimeRates = allAnalytics.map(c => c.onTimeRate).filter((r): r is number => r !== null);
  const globalOnTimeRate = onTimeRates.length > 0 ? Math.round(onTimeRates.reduce((a, b) => a + b, 0) / onTimeRates.length) : null;

  // Agrégation par notion
  const categoryMap = new Map<string, { totalScore: number; count: number; completions: number }>();
  allAnalytics.forEach(item => {
    item.categories.forEach(cat => {
      if (cat.averageScore !== null) {
        const existing = categoryMap.get(cat.category) ?? { totalScore: 0, count: 0, completions: 0 };
        categoryMap.set(cat.category, {
          totalScore: existing.totalScore + cat.averageScore,
          count: existing.count + 1,
          completions: existing.completions + cat.completions,
        });
      }
    });
  });

  const globalCategories = Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    averageScore: Math.round(data.totalScore / data.count),
    completions: data.completions,
  }));

  const weakCategories = globalCategories.filter(c => c.averageScore < WEAK_SCORE_THRESHOLD);

  return (
    <>
      <section className="ec-grid-stats" aria-label="Chiffres clés de toutes mes classes">
        <StatCard icon={GraduationCap} label="Total élèves" value={totalStudents} hint={`${classes.length} classes confiées`} />
        <StatCard icon={ClipboardCheck} label="Taux moyen de rendu à temps" value={percent(globalOnTimeRate)} hint="sur l'ensemble des classes" />
        <StatCard icon={Star} label="Score moyen global" value={percent(globalAvgScore)} hint="sur tous les devoirs rendus" />
        <StatCard icon={HandHelping} label="À accompagner" value={totalNeedingHelp} hint="retards ou difficultés" tone={totalNeedingHelp > 0 ? "warn" : undefined} />
      </section>

      {weakCategories.length > 0 && (
        <div className="ec-alert" style={{ marginBottom: 20 }}>
          <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Bilan global des notions</b> : Notions sous le seuil de 60 % :{" "}
            {weakCategories.map((c, i) => <span key={c.category}>{i > 0 && ", "}<Link href="/enseignant/programme">{c.category}</Link> ({c.averageScore} %)</span>)}.{" "}
            <Link href="/enseignant/missions">Programmer une mission de renforcement</Link>
          </div>
        </div>
      )}

      <div className="ec-grid-2" style={{ marginBottom: 24 }}>
        <section className="ec-card">
          <h2>Comparatif par classe</h2>
          <p style={{ margin: "-6px 0 14px", color: "var(--ec-muted)", fontSize: 13 }}>
            Aperçu synthétique pour repérer rapidement les classes nécessitant du soutien.
          </p>
          <DataTable
            caption="Comparatif par classe"
            columns={[
              { key: "c", header: "Classe", render: row => <b>{className(row.classroom)}</b> },
              { key: "s", header: "Élèves", align: "right", render: row => row.studentCount },
              { key: "t", header: "Rendu à temps", align: "right", render: row => percent(row.onTimeRate) },
              { key: "m", header: "Score moyen", align: "right", render: row => percent(row.averageScore) },
              {
                key: "h", header: "À accompagner", align: "right", render: row => row.studentsNeedingHelp > 0
                  ? <Badge tone="warn">{row.studentsNeedingHelp} élèves</Badge>
                  : <Badge tone="ok">Aucun</Badge>,
              },
            ]}
            rows={allAnalytics}
            rowKey={row => row.classroom.id}
            onRowClick={row => onSelectClass(row.classroom.id)}
            rowLabel={row => `Voir le détail de ${className(row.classroom)}`}
          />
        </section>

        <section className="ec-card">
          <h2>Maîtrise globale par notion</h2>
          <p style={{ margin: "-6px 0 14px", color: "var(--ec-muted)", fontSize: 13 }}>
            Score moyen calculé sur l&apos;ensemble de vos élèves.
          </p>
          <HBarChart
            caption="Score moyen global par notion"
            max={100}
            axis={["0 %", "50 %", "100 %"]}
            data={globalCategories.map(c => ({
              key: c.category,
              label: c.category,
              value: c.averageScore,
              valueLabel: `${c.averageScore} %`,
              tooltip: `${c.category} : ${c.averageScore} % sur ${plural(c.completions, "devoir rendu", "devoirs rendus")}`,
              flag: c.averageScore < WEAK_SCORE_THRESHOLD
                ? <Badge tone="warn"><TriangleAlert size={12} aria-hidden="true" /> À retravailler</Badge>
                : <Badge tone="ok"><CheckCircle2 size={12} aria-hidden="true" /> Maîtrisé</Badge>,
            }))}
          />
        </section>
      </div>
    </>
  );
}

function ClassReport({ analytics }: { analytics: ClassAnalytics }) {
  const [showTable, setShowTable] = useState(false);
  const { categories, progress } = analytics;
  const weak = categories.filter(c => c.averageScore !== null && c.averageScore < WEAK_SCORE_THRESHOLD);
  const top = [...categories].filter(c => c.averageScore !== null).sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0];
  const label = className(analytics.classroom);

  return (
    <>
      <section className="ec-grid-stats" aria-label={`Chiffres clés de ${label}`}>
        <StatCard icon={GraduationCap} label="Élèves" value={analytics.studentCount} />
        <StatCard icon={ClipboardCheck} label="Devoirs rendus à temps" value={percent(analytics.onTimeRate)} hint={analytics.onTimeRate === null ? "aucune date limite passée" : "date limite passée"} />
        <StatCard icon={Star} label="Score moyen" value={percent(analytics.averageScore)} hint="sur les devoirs rendus" />
        <StatCard icon={HandHelping} label="À accompagner" value={analytics.studentsNeedingHelp} hint="retard ou score < 50 %" tone={analytics.studentsNeedingHelp > 0 ? "warn" : undefined} />
      </section>

      {/* Recommandations pédagogiques */}
      <div className="ec-grid-2" style={{ marginBottom: 20 }}>
        {weak.length > 0 ? (
          <div className="ec-alert" style={{ margin: 0 }}>
            <TriangleAlert size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <b>Notions prioritaires à retravailler dans cette classe :</b>{" "}
              {weak.map((c, i) => <span key={c.category}>{i > 0 && ", "}<Link href="/enseignant/programme">{c.category}</Link> ({c.averageScore} %)</span>)}.
              <div style={{ marginTop: 8 }}>
                <Link className="ec-btn ec-btn--primary" href="/enseignant/missions">
                  Assigner un devoir de soutien →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="ec-card" style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--ec-tint-mint)" }}>
            <CheckCircle2 size={24} color="var(--ec-brand)" aria-hidden="true" />
            <div>
              <b style={{ color: "var(--ec-brand)", display: "block" }}>Toutes les notions sont bien assimilées !</b>
              <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>Les scores moyens de la classe dépassent les 60 %.</span>
            </div>
          </div>
        )}

        {top && top.averageScore !== null && (
          <div className="ec-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <TrendingUp size={24} color="var(--ec-brand)" aria-hidden="true" />
            <div>
              <small style={{ color: "var(--ec-muted)", textTransform: "uppercase", fontSize: 11, fontWeight: 700 }}>Point fort de la classe</small>
              <b style={{ display: "block", fontSize: 16 }}>{top.category} ({top.averageScore} %)</b>
              <span style={{ fontSize: 13, color: "var(--ec-muted)" }}>Excellente maîtrise par la majorité des élèves.</span>
            </div>
          </div>
        )}
      </div>

      <div className="ec-grid-2">
        <section className="ec-card" aria-labelledby="categories-titre">
          <h2 id="categories-titre">Réussite par notion</h2>
          <p style={{ margin: "-6px 0 14px", color: "var(--ec-muted)", fontSize: 13 }}>
            Score moyen des devoirs rendus. En dessous de {WEAK_SCORE_THRESHOLD} %, la notion est à retravailler.
          </p>
          <HBarChart
            caption={`Score moyen par notion en ${label}`}
            max={100}
            axis={["0 %", "50 %", "100 %"]}
            data={categories.map(c => ({
              key: c.category,
              label: c.category,
              value: c.averageScore,
              valueLabel: c.averageScore === null ? "Pas encore de données" : `${c.averageScore} %`,
              tooltip: c.averageScore === null
                ? `${c.category} : aucun devoir rendu pour l'instant`
                : `${c.category} : score moyen ${c.averageScore} % sur ${plural(c.completions, "devoir rendu", "devoirs rendus")}`,
              flag: c.averageScore !== null && c.averageScore < WEAK_SCORE_THRESHOLD
                ? <Badge tone="warn"><TriangleAlert size={12} aria-hidden="true" /> À retravailler</Badge>
                : c.averageScore !== null && c.averageScore >= 75
                  ? <Badge tone="ok"><CheckCircle2 size={12} aria-hidden="true" /> Maîtrisé</Badge>
                  : undefined,
            }))}
          />
        </section>

        <section className="ec-card" aria-labelledby="progression-titre">
          <h2 id="progression-titre">Progression dans le parcours</h2>
          <p style={{ margin: "-6px 0 14px", color: "var(--ec-muted)", fontSize: 13 }}>Nombre d&apos;élèves selon les leçons terminées.</p>
          <ColumnChart
            caption={`Répartition des élèves de ${label} selon les leçons terminées`}
            data={progress.map(p => ({ key: p.label, label: p.label, value: p.count, tooltip: `${p.label} : ${plural(p.count, "élève")}` }))}
          />
        </section>
      </div>

      <div style={{ marginTop: 20 }}>
        <button type="button" className="ec-link-btn" aria-expanded={showTable} onClick={() => setShowTable(v => !v)}>
          {showTable ? "Masquer les tableaux de données" : "Afficher les tableaux de données détaillés"}
        </button>
      </div>
      {showTable && (
        <div className="ec-grid-2" style={{ marginTop: 12 }}>
          <DataTable
            caption="Score moyen par notion"
            columns={[
              { key: "c", header: "Notion", render: row => <Link href="/enseignant/programme" style={{ textDecoration: "underline" }}>{row.category}</Link> },
              { key: "s", header: "Score moyen", align: "right", render: row => percent(row.averageScore) },
              { key: "n", header: "Devoirs rendus", align: "right", render: row => row.completions },
            ]}
            rows={categories}
            rowKey={row => row.category}
          />
          <DataTable
            caption="Élèves par progression"
            columns={[
              { key: "l", header: "Leçons terminées", render: row => row.label },
              { key: "n", header: "Élèves", align: "right", render: row => row.count },
            ]}
            rows={progress}
            rowKey={row => row.label}
          />
        </div>
      )}
    </>
  );
}

export function AnalyticsView() {
  const loadClasses = listTeacherClasses;
  const { data: classes, error } = useApi(loadClasses);
  const [chosen, setChosen] = useState<string>("all");

  const isAll = chosen === "all";
  const classId = !isAll && classes?.some(c => c.classroom.id === chosen) ? chosen : null;
  const loadAnalytics = useCallback(() => getClassAnalytics(classId ?? ""), [classId]);

  return (
    <>
      <PageHeader
        title="Analytiques & Bilan"
        subtitle="Réussite par notion, suivi de la progression et élèves à accompagner."
        actions={
          <button type="button" className="ec-btn ec-btn--ghost" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Exporter / Imprimer
          </button>
        }
      />
      {error ? (
        <ErrorMessage message={error} />
      ) : !classes ? (
        <Skeleton height={300} />
      ) : classes.length === 0 ? (
        <div className="ec-card"><EmptyState icon={School} title="Aucune classe ne vous est confiée pour l'instant" /></div>
      ) : (
        <>
          <div className="ec-segmented" role="group" aria-label="Choisir la classe ou la vue globale" style={{ marginBottom: 24 }}>
            {classes.length > 1 && (
              <button type="button" aria-pressed={isAll} onClick={() => setChosen("all")}>
                Toutes mes classes (Vue globale)
              </button>
            )}
            {classes.map(({ classroom }) => (
              <button
                key={classroom.id}
                type="button"
                aria-pressed={classroom.id === classId}
                onClick={() => setChosen(classroom.id)}
              >
                {className(classroom)}
              </button>
            ))}
          </div>

          {isAll && classes.length > 1 ? (
            <GlobalReport classes={classes} onSelectClass={id => setChosen(id)} />
          ) : (
            (classId || classes[0]) && (
              <ClassAnalyticsLoader
                key={classId ?? classes[0].classroom.id}
                load={classId ? loadAnalytics : () => getClassAnalytics(classes[0].classroom.id)}
              />
            )
          )}
        </>
      )}
    </>
  );
}

function ClassAnalyticsLoader({ load }: { load: () => Promise<ClassAnalytics> }) {
  const { data, error } = useApi(load);
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <Skeleton height={300} />;
  return <ClassReport analytics={data} />;
}

