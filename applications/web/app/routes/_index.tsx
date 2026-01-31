
import { Form, useActionData, useNavigation, useLoaderData, useRevalidator, useNavigate } from "react-router";
import { Link, Loader2, Copy, ExternalLink, BarChart, Check } from "lucide-react";
import type { Route } from "./+types/_index";
import { 
  shortenUrlUseCase, 
  repository,
  InvalidUrlError,
  isDatabaseError,
  getErrorMessage,
  getErrorCode,
} from "@url-shortener/engine";
import { useEffect, useState } from "react";

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
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { useUrlValidation } from "~/hooks/useUrlValidation";

export async function loader({ request }: Route.LoaderArgs) {
  try {
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
  } catch (error) {
    console.error('Loader error:', error);
    
    // Check if it's a database connection error
    if (isDatabaseError(error)) {
      return {
        urls: [],
        baseUrl: '',
        error: getErrorMessage(error),
        errorCode: getErrorCode(error),
      };
    }
    
    return {
      urls: [],
      baseUrl: '',
      error: 'Failed to load URLs. Please try again.',
    };
  }
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
  } catch (error) {
    console.error('Action error:', error);
    
    // Handle specific error types
    if (error instanceof InvalidUrlError) {
      return { error: error.message };
    }
    
    if (isDatabaseError(error)) {
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      
      // Provide specific guidance for database errors
      if (code === 'DATABASE_CONNECTION_ERROR') {
        return { 
          error: 'Database is currently unavailable. Please ensure the database is running and try again.',
          errorCode: code,
        };
      }
      
      if (code === 'DATABASE_TIMEOUT_ERROR') {
        return { 
          error: 'Database operation timed out. Please try again.',
          errorCode: code,
        };
      }
      
      return { error: message, errorCode: code };
    }
    
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
  const { urls, baseUrl, error: loaderError, errorCode: loaderErrorCode } = loaderData;
  const navigation = useNavigation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const isSubmitting = navigation.state === "submitting";
  const isLoading = navigation.state === "loading" || revalidator.state === "loading";
  const { 
    validationError, 
    touched, 
    validate, 
    markAsTouched, 
    reset: resetValidation,
    shouldShowError 
  } = useUrlValidation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lastShortenedUrl, setLastShortenedUrl] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Handle local form submission to prevent unnecessary server calls
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    // const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const url = formData.get("url") as string;
    
    markAsTouched();
    if (!validate(url)) {
      event.preventDefault();
      return;
    }
  };

  // On mount and when actionData changes, ensure we load the user's links
  useEffect(() => {
    const codes = getStoredShortCodes();
    const searchParams = new URLSearchParams(window.location.search);
    const hasShortCodesParam = searchParams.has('shortCodes');

    if (codes.length > 0) {
      // Navigate with shortCodes query param to load user's links
      const params = new URLSearchParams({ shortCodes: codes.join(',') });
      // Only navigate if params are different to avoid unnecessary history entries
      if (searchParams.get('shortCodes') !== codes.join(',')) {
        navigate(`/?${params.toString()}`, { replace: true });
      }
    } else if (hasShortCodesParam) {
      // If localStorage is empty but we have params, clear them
      navigate('/', { replace: true });
    }
  }, []);

  // When a new URL is shortened, save it to localStorage and revalidate
  useEffect(() => {
    if (actionData?.success && actionData?.shortCode && actionData?.shortenedUrl) {
      addShortCode(actionData.shortCode);
      // Revalidate to fetch the updated list with the new shortCode
      const codes = getStoredShortCodes();
      const params = new URLSearchParams({ shortCodes: codes.join(',') });
      navigate(`/?${params.toString()}`, { replace: true });
      revalidator.revalidate();
      
      // Reset validation state on success
      resetValidation();
      
      // Clear input manually if needed (Form usually does this on successful non-JS navigation but we're in SPA mode)
      const input = document.getElementById('url') as HTMLInputElement;
      if (input) input.value = '';

      // Set state and auto copy
      setLastShortenedUrl(actionData.shortenedUrl);
      navigator.clipboard.writeText(actionData.shortenedUrl);
      setIsDialogOpen(true);
      setCopiedCode('new-url');
      setTimeout(() => setCopiedCode(null), 2000);
    }
  }, [actionData, revalidator, navigate, resetValidation]);

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

        {/* Database Error Alert */}
        {loaderError && (
          <Card className="border-destructive/50 bg-destructive/5" data-testid="error-alert">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {loaderErrorCode === 'DATABASE_CONNECTION_ERROR' ? 'Database Connection Error' : 'Error Loading Data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground" data-testid="error-message">{loaderError}</p>
              {loaderErrorCode === 'DATABASE_CONNECTION_ERROR' && (
                <div className="mt-4 p-3 bg-muted rounded-md" data-testid="troubleshooting-steps">
                  <p className="text-xs font-mono">
                    Troubleshooting steps:<br />
                    1. Ensure the database is running<br />
                    2. Check database connection settings<br />
                    3. Verify network connectivity
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shortener Card */}
        <Card className="shadow-lg border-muted">
          <CardHeader>
             <CardTitle>Shorten a new URL</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="url">Long URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    name="url"
                    placeholder="https://example.com/very-long-url..."
                    required
                    data-testid="url-input"
                    className={`flex-1 ${shouldShowError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-invalid={shouldShowError || actionData?.error ? true : undefined}
                    aria-describedby={shouldShowError ? "url-error" : undefined}
                    onChange={(e) => touched && validate(e.target.value)}
                    onBlur={() => markAsTouched()}
                  />
                  <Button type="submit" disabled={isSubmitting} data-testid="shorten-button">
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
                {shouldShowError && (
                  <p id="url-error" className="text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1" data-testid="validation-error">
                    {validationError?.message}
                  </p>
                )}
                {!shouldShowError && actionData?.error && (
                  <p className="text-sm text-destructive font-medium" data-testid="action-error">{actionData.error}</p>
                )}
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Success Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogHeader>
            <DialogTitle>Success! Here's your short link</DialogTitle>
            <DialogDescription>
              Your URL has been successfully shortened and copied to your clipboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-4">
            <Input
              readOnly
              value={lastShortenedUrl || ''}
              data-testid="dialog-shortened-url-input"
              className="bg-muted font-mono text-sm"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              variant="secondary"
              size="icon"
              data-testid="dialog-copy-button"
              onClick={() => lastShortenedUrl && handleCopy(lastShortenedUrl, 'new-url')}
              title="Copy to clipboard"
            >
              {copiedCode === 'new-url' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
              data-testid="dialog-open-link-button"
              title="Open link"
            >
              <a href={lastShortenedUrl || '#'} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </Dialog>

        {/* Recent URLs Table */}
        {urls.length > 0 && (
          <div className="space-y-4" data-testid="recent-links-section">
            <h2 className="text-2xl font-semibold tracking-tight">Your Recent Links</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {urls.map((url) => (
                <Card key={url.shortCode} className="flex flex-col" data-testid={`link-card-${url.shortCode}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="font-mono text-primary" data-testid="short-code-display">{url.shortCode}</span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full" data-testid="visit-count">
                        <BarChart className="w-3 h-3" />
                        <span>{url.visitCount} visits</span>
                      </div>
                    </CardTitle>
                    <CardDescription className="text-xs truncate" title={url.originalUrl} data-testid="original-url-display">
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
                       <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopy(baseUrl + url.shortCode, url.shortCode)}
                            title="Copy"
                            type="button"
                          >
                            {copiedCode === url.shortCode ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                            title="Go to URL"
                          >
                            <a href={baseUrl + url.shortCode} target="_blank" rel="noopener noreferrer">
                               <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                       </div>
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

