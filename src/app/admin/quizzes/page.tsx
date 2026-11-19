import { AdminResourcePage } from "@/components/admin/AdminResourcePage";

export default function AdminQuizzesPage() {
  return (
    <AdminResourcePage
      resourceKeys={["quizzes", "quiz_answers"]}
      title="Quiz e prove"
      description="Domande, suggerimenti, punteggi e risposte. Le risposte corrette sono leggibili solo dagli amministratori."
    />
  );
}
