import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AboutPage() {
  return (
    <div className="min-h-screen p-8 bg-gradient-to-b from-green-900 to-green-800 text-white">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-yellow-400 drop-shadow-lg">
            Christmas Wonderland
          </h1>
          <p className="text-lg text-white/80">
            Un calendario dell&apos;Avvento interattivo ambientato in un villaggio
            natalizio navigabile
          </p>
        </header>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader>
            <CardTitle className="text-yellow-400">Il Progetto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-white/90 leading-relaxed">
            <p>
              Christmas Wonderland è un&apos;esperienza digitale immersiva che
              trasforma il periodo natalizio in un&apos;avventura interattiva. Gli
              utenti esplorano un villaggio natalizio composto da location
              uniche, ciascuna con sorprese, regali e attività speciali.
            </p>
            <p>
              Il calendario dell&apos;Avvento accompagna gli utenti dal 1° al 24
              dicembre, svelando ogni giorno nuovi contenuti, messaggi segreti,
              quiz e regali fisici da ritirare presso le diverse location del
              villaggio.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20 text-white">
          <CardHeader>
            <CardTitle className="text-yellow-400">
              Caratteristiche Principali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-white/90 list-disc list-inside">
              <li>Calendario dell&apos;Avvento interattivo con 24 giorni di sorprese</li>
              <li>Villaggio natalizio navigabile con location tematiche</li>
              <li>Regali fisici associati a specifiche location</li>
              <li>Messaggi segreti ed elfi comunicanti</li>
              <li>Quiz interattivi con premi</li>
              <li>Sfera dei ricordi personale per conservare i momenti speciali</li>
              <li>Notifiche personalizzate per non perdere nessuna sorpresa</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
