package nl.dylannas.open_trivia_quinoa.features.get_questions;

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
import org.hibernate.Session;
import org.jboss.resteasy.reactive.RestResponse;
import org.mapstruct.factory.Mappers;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;
import java.util.logging.Logger;

@Path("get_questions")
public class GetQuestionsEndpoint {
    private final QuestionsAndAnswersMapper mapper = Mappers.getMapper(QuestionsAndAnswersMapper.class);
    private static final Logger LOG = Logger.getLogger(String.valueOf(GetQuestionsEndpoint.class));

    @Inject
    OpenTriviaApiClient openTriviaApiClient;

    @GET
    public Uni<RestResponse<GetQuestionsResponseModel>> GetQuestions(@BeanParam @Valid GetQuestionsRequestModel request) {
        Uni<RestResponse<GetQuestionsAndAnswersDTO>> response;

        QuestionEncoding encoding;
        if (request.encoding() != null) encoding = request.encoding().toApiType();
        else encoding = null;

        Integer categoryId;
        if (request.categoryId() != -1) categoryId = request.categoryId();
        else categoryId = null;

        response = openTriviaApiClient.getQuestionsAndAnswers(request.amount(),
                request.difficulty().toApiType(),
                request.type().toApiType(),
                encoding,
                categoryId);

        return response.flatMap(x -> transformAndPersistQuestions(x.getEntity().results)).map(x -> {
            var itemList = new LinkedList<GetQuestionsItemModel>();

            for (QuestionAndAnswerModel result : x) {
                var possibleAnswers = new java.util.ArrayList<String>();
                possibleAnswers.add(result.correct_answer);
                possibleAnswers.addAll(result.incorrect_answers);
                Collections.shuffle(possibleAnswers);

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
        return Multi.createFrom().iterable(dtoList).onItem().transformToUniAndConcatenate(dto -> {
            var mapped = mapper.dtoToStateModel(dto);

            return tcService.GetCategoryId(dto.category)
                    .onItem()
                    .invoke(categoryId -> mapped.category = categoryId)
                    .replaceWith(mapped);
        }).collect().asList().emitOn(Infrastructure.getDefaultWorkerPool()).onItem().transform(this::persistQuestions);
    }

    private static final String RESOLVE_QUESTION = """
            SELECT * FROM get_or_create_question(
                :category, :correctAnswer, CAST(:difficulty AS smallint),
                CAST(:incorrectAnswers AS varchar[]), :question, CAST(:type AS smallint)
            )
            """;

    @Transactional
    List<QuestionAndAnswerModel> persistQuestions(List<QuestionAndAnswerModel> questions) {
        var resolved = new ArrayList<QuestionAndAnswerModel>(questions.size());

        for (var question : questions) {
            var stored = em.unwrap(Session.class)
                    .createNativeQuery(RESOLVE_QUESTION, QuestionAndAnswerModel.class)
                    .setParameter("category", question.category, Integer.class)
                    .setParameter("correctAnswer", question.correct_answer, String.class)
                    .setParameter("difficulty",
                            question.difficulty == null ? null : question.difficulty.ordinal(),
                            Integer.class)
                    .setParameter("incorrectAnswers",
                            question.incorrect_answers == null ? null : question.incorrect_answers.toArray(String[]::new),
                            String[].class)
                    .setParameter("question", question.question, String.class)
                    .setParameter("type", question.type == null ? null : question.type.ordinal(), Integer.class)
                    .getSingleResult();
            resolved.add(stored);
        }

        return resolved;
    }
}
