package nl.dylannas.open_trivia_quinoa.features.check_answers;

import io.quarkus.cache.CacheResult;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import nl.dylannas.open_trivia_quinoa.models.QuestionAndAnswerModel;
import nl.dylannas.open_trivia_quinoa.models.QuestionsAndAnswersMapper;
import org.jboss.resteasy.reactive.RestResponse;
import org.mapstruct.factory.Mappers;

import java.util.List;
import java.util.logging.Logger;

@Path("check_answers")
public class CheckAnswersEndpoint {
    private final QuestionsAndAnswersMapper mapper = Mappers.getMapper(QuestionsAndAnswersMapper.class);
    private static final Logger LOG = Logger.getLogger(String.valueOf(CheckAnswersEndpoint.class));

    @POST
    @CacheResult(cacheName = "endpoint-answers")
    public RestResponse<CheckAnswersResponseModel> GetAnswers(CheckAnswersRequestModel request) {
        List<QuestionAndAnswerModel> questions = QuestionAndAnswerModel.findByIds(request.question_ids());

        var answers = questions.stream().map(mapper::stateToCheckItemModel).toList();

        return RestResponse.ok(new CheckAnswersResponseModel(answers));
    }
}
