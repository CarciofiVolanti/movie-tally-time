import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AboutProps {
  onBack: () => void;
}

const About = ({ onBack }: AboutProps) => (
  <main className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 px-4 pb-10 pt-[calc(1rem+env(safe-area-inset-top))]">
    <div className="mx-auto max-w-2xl">
      <header className="mb-10 flex items-center justify-between gap-4">
        <Button onClick={onBack} variant="ghost" className="-ml-2">
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Back
        </Button>
        <ThemeToggle />
      </header>

      <h1 className="mb-3 text-3xl font-bold bg-gradient-cinema bg-clip-text text-transparent sm:text-4xl">
        About CarciOscar
      </h1>
      <p className="mb-10 max-w-prose leading-7 text-muted-foreground">
        CarciOscar helps your group choose a movie, keep track of what you watch, and share ratings.
      </p>

      <section aria-labelledby="tmdb-credit-title" className="border-t border-border pt-7">
        <h2 id="tmdb-credit-title" className="mb-5 text-xl font-semibold">Movie data and images</h2>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noreferrer"
          aria-label="The Movie Database (TMDB), opens in a new tab"
          className="mb-5 inline-flex rounded-md bg-white p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg"
            alt="The Movie Database (TMDB)"
            className="h-8 w-auto"
          />
        </a>
        <p className="mb-4 max-w-prose leading-7 text-muted-foreground">
          Movie information and images are provided by TMDB.
        </p>
        <p className="max-w-prose text-sm leading-6 text-muted-foreground">
          This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.
        </p>
      </section>
    </div>
  </main>
);

export default About;
