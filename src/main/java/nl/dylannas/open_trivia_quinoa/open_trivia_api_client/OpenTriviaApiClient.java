package nl.dylannas.open_trivia_quinoa.open_trivia_api_client;

import io.smallrye.mutiny.Uni;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.*;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.RestQuery;
import org.jboss.resteasy.reactive.RestResponse;

@RegisterRestClient(configKey = "open-trivia-api")
public interface OpenTriviaApiClient {
    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount);

    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount,
                                                                        @RestQuery QuestionDifficulty difficulty);

    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount,
                                                                        @RestQuery QuestionType type);

    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount,
                                                                        @RestQuery QuestionDifficulty difficulty,
                                                                        @RestQuery QuestionType type);

    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount,
                                                                        @RestQuery QuestionDifficulty difficulty,
                                                                        @RestQuery QuestionType type,
                                                                        @RestQuery("category") Integer categoryId);

    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount,
                                                                        @RestQuery QuestionDifficulty difficulty,
                                                                        @RestQuery QuestionType type,
                                                                        @RestQuery("encode") QuestionEncoding encoding);

    @GET
    @Path("/api.php")
    Uni<RestResponse<GetQuestionsAndAnswersDTO>> getQuestionsAndAnswers(@RestQuery Integer amount,
                                                                        @RestQuery QuestionDifficulty difficulty,
                                                                        @RestQuery QuestionType type,
                                                                        @RestQuery("encode") QuestionEncoding encoding,
                                                                        @RestQuery("category") Integer categoryId);

    @GET
    @Path("/api_category.php")
    Uni<RestResponse<GetCategoriesDTO>> getCategories();
}
