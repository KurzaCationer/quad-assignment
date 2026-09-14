package nl.dylannas.open_trivia_quinoa.features.get_questions;

import java.util.List;

public record GetQuestionsResponseModel(
        List<GetQuestionsItemModel> questions
) {
}

