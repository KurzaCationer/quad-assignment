package nl.dylannas.open_trivia_quinoa.models;

import nl.dylannas.open_trivia_quinoa.features.get_answers.CheckAnswersItemModel;
import nl.dylannas.open_trivia_quinoa.features.get_questions.GetQuestionsItemModel;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionAndAnswersDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper
public interface QuestionsAndAnswersMapper {
    @Mapping(target = "category", ignore = true)
    QuestionAndAnswerModel dtoToStateModel(QuestionAndAnswersDTO dto);

    @Mapping(target = "possible_answers", source = "possible_answers")
    GetQuestionsItemModel stateToGetItemModel(QuestionAndAnswerModel model, List<String> possible_answers);

    CheckAnswersItemModel stateToCheckItemModel(QuestionAndAnswerModel model);

    default QuestionType mapEnum(nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionType sourceType) {
        if (sourceType == null) {
            return null;
        }
        return QuestionType.valueOf(sourceType.name());
    }

    default nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionType mapEnum(QuestionType sourceType) {
        if (sourceType == null) {
            return null;
        }
        return nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.QuestionType.valueOf(sourceType.name());
    }
}
