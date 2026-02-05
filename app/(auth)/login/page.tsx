import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return <Card className="z-10">
    <CardContent>
      <LoginForm />
    </CardContent>
  </Card>;
}