package nl.dylannas.open_trivia_quinoa.features.get_questions;

import io.quarkus.cache.CacheResult;
import io.smallrye.common.annotation.Blocking;
import io.smallrye.mutiny.Multi;
import io.smallrye.mutiny.Uni;
import io.smallrye.mutiny.infrastructure.Infrastructure;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.BeanParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import nl.dylannas.open_trivia_quinoa.models.QuestionAndAnswerModel;
import nl.dylannas.open_trivia_quinoa.models.QuestionsAndAnswersMapper;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.OpenTriviaApiClient;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.GetQuestionsAndAnswersDTO;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionAndAnswersDTO;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionEncoding;
import nl.dylannas.open_trivia_quinoa.services.TriviaCategoryService;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.resteasy.reactive.RestResponse;
import org.mapstruct.factory.Mappers;

import java.util.LinkedList;
import java.util.List;
import java.util.logging.Logger;

@Path("get_questions")
public class GetQuestionsEndpoint {
    private final QuestionsAndAnswersMapper mapper = Mappers.getMapper(QuestionsAndAnswersMapper.class);
    private static final Logger LOG = Logger.getLogger(String.valueOf(GetQuestionsEndpoint.class));

    @RestClient
    OpenTriviaApiClient openTriviaApiClient;

    @GET
    @CacheResult(cacheName = "endpoint-questions")
    public Uni<RestResponse<GetQuestionsResponseModel>> GetQuestions(@BeanParam @Valid GetQuestionsRequestModel request) {
        Uni<RestResponse<GetQuestionsAndAnswersDTO>> response;

        QuestionEncoding encoding;
        if(request.encoding() != null){
            encoding = request.encoding().toApiType();
        } else {
            encoding = null;
        }

        Integer categoryId;
        if(request.categoryId() != -1){
            categoryId = request.categoryId();
        } else {
            categoryId = null;
        }

        response = openTriviaApiClient.getQuestionsAndAnswers(request.amount(),
                request.difficulty().toApiType(),
                request.type().toApiType(),
                encoding,
                categoryId);

        return response
                .flatMap(x -> transformAndPersistQuestions(x.getEntity().results))
                .map(x -> {
                    var itemList = new LinkedList<GetQuestionsItemModel>();

                    for (QuestionAndAnswerModel result : x) {
                        var possibleAnswers = new java.util.ArrayList<String>();
                        possibleAnswers.add(result.correct_answer);
                        possibleAnswers.addAll(result.incorrect_answers);

                        itemList.add(mapper.stateToGetItemModel(result, possibleAnswers));
                    }

                    return RestResponse.ok(new GetQuestionsResponseModel(itemList));
                });
    }

    @Inject
    EntityManager em;

    @Inject
    TriviaCategoryService tcService;

    private Uni<List<QuestionAndAnswerModel>> transformAndPersistQuestions(List<QuestionAndAnswersDTO> dtoList) {
        return Multi.createFrom().iterable(dtoList)
                .onItem().transformToUniAndConcatenate(dto -> {
                    var mapped = mapper.dtoToStateModel(dto);

                    return tcService.GetCategoryId(dto.category)
                            .onItem().invoke(categoryId -> mapped.category = categoryId)
                            .replaceWith(mapped);
                })
                .collect().asList()
                .onItem().invoke(this::persistQuestions)
                .runSubscriptionOn(
                        Infrastructure.getDefaultWorkerPool()
                );
    }

    @Transactional
    @Blocking
    void persistQuestions(List<QuestionAndAnswerModel> questions) {

        questions.forEach(question -> {
            question.persist();
        });

    }
}
