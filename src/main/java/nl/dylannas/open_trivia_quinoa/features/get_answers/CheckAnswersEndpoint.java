package nl.dylannas.open_trivia_quinoa.features.get_answers;

import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import nl.dylannas.open_trivia_quinoa.ApiException;
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
    public RestResponse<CheckAnswersResponseModel> GetAnswers(CheckAnswersRequestModel request) {
        if (request == null || request.question_ids() == null || request.question_ids().isEmpty()
                || request.question_ids().size() > 20 || request.question_ids().stream().anyMatch(java.util.Objects::isNull)
                || request.question_ids().stream().distinct().count() != request.question_ids().size()) {
            throw new ApiException(400, "Submit between 1 and 20 unique question IDs.");
        }
        List<QuestionAndAnswerModel> questions = QuestionAndAnswerModel.findByIds(request.question_ids());
        if (questions.size() != request.question_ids().size()) {
            throw new ApiException(404, "Some questions are no longer available. Start a new quiz and try again.");
        }

        var answers = questions.stream().map(mapper::stateToCheckItemModel).toList();

        return RestResponse.ok(new CheckAnswersResponseModel(answers));
    }
}
