package nl.dylannas.open_trivia_quinoa.features.get_answers;

import java.util.List;

public record CheckAnswersResponseModel(
        List<CheckAnswersItemModel> answers
) {
}