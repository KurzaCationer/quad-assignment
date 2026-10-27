package nl.dylannas.open_trivia_quinoa;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ExecutionException;
import java.util.logging.Level;
import java.util.logging.Logger;

@Provider
public class GlobalExceptionHandler implements ExceptionMapper<Exception> {
    private static final Logger LOG = Logger.getLogger(GlobalExceptionHandler.class.getName());

    public record ErrorResponse(String message) {}

    @Override
    public Response toResponse(Exception exception) {
        Throwable cause = exception;
        while ((cause instanceof CompletionException || cause instanceof ExecutionException) && cause.getCause() != null) {
            cause = cause.getCause();
        }
        int status = 500;
        String message = "Something went wrong. Please try again.";
        if (cause instanceof ApiException apiException) {
            status = apiException.status();
            message = apiException.getMessage();
        } else if (cause instanceof WebApplicationException webException) {
            status = webException.getResponse().getStatus();
            if (status < 500) message = "The request is invalid. Please check your input and try again.";
        }
        if (status >= 500) LOG.log(Level.SEVERE, "API request failed", exception);
        return Response.status(status).type(MediaType.APPLICATION_JSON).entity(new ErrorResponse(message)).build();
    }
}
