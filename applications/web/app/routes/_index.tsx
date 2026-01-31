
import { Form, useActionData, useNavigation } from "react-router";
import { Link, Loader2 } from "lucide-react";
import type { Route } from "./+types/_index";
import {
  baseUrl,
  shortenedUrls,
  generateShortCode,
} from "@url-shortener/engine"; // Assuming this path is correct based on previous file content

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

export function loader() {
  return {
    baseUrl: baseUrl ? baseUrl + "/s/" : "-",
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = formData.get("url") as string;

  if (!url) {
    return { error: "URL is required" };
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (e) {
    return { error: "Please enter a valid URL (e.g., https://example.com)" };
  }

  const shortCode = generateShortCode();
  
  // TODO: persistent storage
  shortenedUrls.set(shortCode, url);

  return {
    shortenedUrl: `${baseUrl}/s/${shortCode}`,
  };
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "URL Shortener" },
    { name: "description", content: "Shorten your URLs quickly and easily" },
  ];
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Link className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">URL Shortener</CardTitle>
          </div>
          <CardDescription>
            Enter a long URL to generate a short, shareable link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Long URL</Label>
              <Input
                id="url"
                type="url"
                name="url"
                placeholder="https://example.com/very-long-url..."
                required
                className="w-full"
                aria-invalid={actionData?.error ? true : undefined}
              />
              {actionData?.error && (
                <p className="text-sm text-destructive">{actionData.error}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Shortening...
                </>
              ) : (
                "Shorten URL"
              )}
            </Button>
          </Form>

          {actionData?.shortenedUrl && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Shortened URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={actionData.shortenedUrl}
                  className="bg-background font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                     navigator.clipboard.writeText(actionData.shortenedUrl);
                  }}
                  title="Copy to clipboard"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
          <p>
            Fast, secure, and reliable URL shortening service.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}
