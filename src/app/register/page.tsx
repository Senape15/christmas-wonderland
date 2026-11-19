import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-900 to-green-800 p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-yellow-400">
            Christmas Wonderland
          </CardTitle>
          <CardDescription className="text-center text-white/80">
            Crea il tuo account per iniziare l&apos;avventura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
