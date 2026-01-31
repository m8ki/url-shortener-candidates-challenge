
import { Form, useActionData, useNavigation, useLoaderData, useRevalidator, useNavigate } from "react-router";
import { Link, Loader2, Copy, ExternalLink, BarChart } from "lucide-react";
import type { Route } from "./+types/_index";
import { shortenUrlUseCase, repository } from "@url-shortener/engine";
import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export async function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);
  
  // Get shortCodes from query params (sent from client-side localStorage)
  const shortCodesParam = url.searchParams.get('shortCodes');
  const shortCodes = shortCodesParam ? shortCodesParam.split(',').filter(Boolean) : [];
  
  // Only fetch URLs that match the user's shortCodes from localStorage
  let urls: Awaited<ReturnType<typeof repository.findAllWithStats>> = [];
  if (shortCodes.length > 0) {
    const allUrls = await repository.findAllWithStats();
    urls = allUrls.filter(url => shortCodes.includes(url.shortCode));
  }
  
  return {
    urls,
    baseUrl: `${origin}/s/`,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = formData.get("url") as string;

  if (!url) {
    return { error: "URL is required" };
  }

  try {
    new URL(url);
  } catch (e) {
    return { error: "Please enter a valid URL (e.g., https://example.com)" };
  }

  try {
    const shortUrl = await shortenUrlUseCase.execute(url);
    const origin = new URL(request.url).origin;
    
    return {
      shortenedUrl: `${origin}/s/${shortUrl.shortCode}`,
      shortCode: shortUrl.shortCode,
      success: true,
    };
  } catch (e) {
    console.error(e);
    return { error: "Failed to shorten URL. Please try again." };
  }
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "URL Shortener" },
    { name: "description", content: "Shorten your URLs quickly and easily" },
  ];
}

const STORAGE_KEY = 'url-shortener-codes';

// Helper functions for localStorage
function getStoredShortCodes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addShortCode(shortCode: string) {
  if (typeof window === 'undefined') return;
  try {
    const codes = getStoredShortCodes();
    if (!codes.includes(shortCode)) {
      codes.unshift(shortCode); // Add to beginning
      localStorage.setItem(STORAGE_KEY, JSON.stringify(codes.slice(0, 50))); // Keep last 50
    }
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const { urls, baseUrl } = loaderData;
  const navigation = useNavigation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const isSubmitting = navigation.state === "submitting";

  // On mount and when actionData changes, ensure we load the user's links
  useEffect(() => {
    const codes = getStoredShortCodes();
    if (codes.length > 0) {
      // Navigate with shortCodes query param to load user's links
      const params = new URLSearchParams({ shortCodes: codes.join(',') });
      navigate(`/?${params.toString()}`, { replace: true });
    }
  }, []);

  // When a new URL is shortened, save it to localStorage and revalidate
  useEffect(() => {
    if (actionData?.success && actionData?.shortCode) {
      addShortCode(actionData.shortCode);
      // Revalidate to fetch the updated list with the new shortCode
      const codes = getStoredShortCodes();
      const params = new URLSearchParams({ shortCodes: codes.join(',') });
      navigate(`/?${params.toString()}`, { replace: true });
      revalidator.revalidate();
    }
  }, [actionData, revalidator, navigate]);

  return (
    <main className="min-h-screen bg-gray-50/50 p-4 dark:bg-gray-900 font-sans">
      <div className="container mx-auto max-w-4xl py-12 space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Link className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">URL Shortener</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
             Enter a long URL to generate a short, shareable link instantly. Track your link's performance with built-in analytics.
          </p>
        </div>

        {/* Shortener Card */}
        <Card className="shadow-lg border-muted">
          <CardHeader>
             <CardTitle>Shorten a new URL</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Long URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    name="url"
                    placeholder="https://example.com/very-long-url..."
                    required
                    className="flex-1"
                    aria-invalid={actionData?.error ? true : undefined}
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Shortening...
                      </>
                    ) : (
                      "Shorten"
                    )}
                  </Button>
                </div>
                {actionData?.error && (
                  <p className="text-sm text-destructive">{actionData.error}</p>
                )}
              </div>
            </Form>

            {actionData?.shortenedUrl && (
              <div className="mt-6 p-4 bg-green-50/50 border border-green-100 dark:bg-green-900/10 dark:border-green-900/20 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wider font-semibold">
                  Success! Here's your short link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={actionData.shortenedUrl}
                    className="bg-background font-mono text-sm border-green-200 dark:border-green-800"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                       navigator.clipboard.writeText(actionData.shortenedUrl);
                    }}
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                    title="Open link"
                  >
                    <a href={actionData.shortenedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent URLs Table */}
        {urls.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Your Recent Links</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {urls.map((url) => (
                <Card key={url.shortCode} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-mono text-primary">{url.shortCode}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <BarChart className="w-3 h-3" />
                        <span>{url.visitCount} visits</span>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-xs truncate" title={url.originalUrl}>
                      {url.originalUrl}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2 flex-1">
                   {/* Spacer if needed or more stats */}
                  </CardContent>
                  <CardFooter className="pt-2 border-t bg-muted/20">
                    <div className="flex items-center justify-between w-full gap-2">
                       <span className="text-xs text-muted-foreground font-mono truncate">
                         {baseUrl}{url.shortCode}
                       </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                             navigator.clipboard.writeText(baseUrl + url.shortCode);
                          }}
                          title="Copy"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
