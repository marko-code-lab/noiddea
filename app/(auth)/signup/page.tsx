import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent } from "@/components/ui/card";

export default function Page() {
  return <Card className="z-10">
    <CardContent>
      <SignupForm />
    </CardContent>
  </Card>;
}