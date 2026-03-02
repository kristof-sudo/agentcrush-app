import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";

export default function Header() {
  return (
    <header className="border-b border-white/10">
      <Container className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/agentcrush-logo-transparent.png"
            alt="AgentCrush"
            width={160}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/rankings"><Button variant="ghost">Rankings</Button></Link>
          <Link href="/submit"><Button variant="ghost">Submit</Button></Link>
          <Link href="/shop"><Button variant="ghost">Shop</Button></Link>
        </nav>
      </Container>
    </header>
  );
}
