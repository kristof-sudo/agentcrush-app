import Link from "next/link";
import Image from "next/image";
import Container from "@/components/ui/Container";

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-md">
      <Container className="flex items-center py-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/agentcrush-logo-transparent.png"
            alt="AgentCrush"
            width={160}
            height={40}
            className="h-7 w-auto"
            priority
          />
        </Link>
      </Container>
    </header>
  );
}
