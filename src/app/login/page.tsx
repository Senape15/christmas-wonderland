import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-900 to-green-800 p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20 text-white">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-yellow-400">
            Christmas Wonderland
          </CardTitle>
          <CardDescription className="text-center text-white/80">
            Accedi per iniziare la tua avventura natalizia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
