import { redirect } from "react-router";
import type { Route } from "./+types/s.$code";
import { 
  getOriginalUrlUseCase,
  isDatabaseError,
  getErrorMessage,
  getErrorCode,
} from "@url-shortener/engine";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { code } = params;

  try {
    const url = await getOriginalUrlUseCase.execute(
      code, 
      request.headers.get("user-agent") || undefined
    );

    if (!url) {
      throw new Response("Short URL not found", { 
        status: 404,
        statusText: "Not Found" 
      });
    }

    return redirect(url);
  } catch (error) {
    // If it's already a Response (404), rethrow it
    if (error instanceof Response) {
      throw error;
    }

    // Handle database errors
    if (isDatabaseError(error)) {
      const message = getErrorMessage(error);
      const code = getErrorCode(error);
      
      if (code === 'DATABASE_CONNECTION_ERROR') {
        throw new Response(
          "Database is currently unavailable. Please try again later.", 
          { status: 503, statusText: "Service Unavailable" }
        );
      }
      
      if (code === 'DATABASE_TIMEOUT_ERROR') {
        throw new Response(
          "Request timed out. Please try again.", 
          { status: 504, statusText: "Gateway Timeout" }
        );
      }
      
      throw new Response(message, { 
        status: 500, 
        statusText: "Internal Server Error" 
      });
    }

    // Generic error
    throw new Response("An error occurred while processing your request", { 
      status: 500,
      statusText: "Internal Server Error" 
    });
  }
}
