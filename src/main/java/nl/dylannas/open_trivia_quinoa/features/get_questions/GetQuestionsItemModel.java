package nl.dylannas.open_trivia_quinoa.features.get_questions;

import nl.dylannas.open_trivia_quinoa.models.QuestionDifficulty;
import nl.dylannas.open_trivia_quinoa.models.QuestionType;

import java.util.List;
import java.util.UUID;

public record GetQuestionsItemModel(
        UUID id,
        QuestionType type,
        QuestionDifficulty difficulty,
        Integer category,
        String question,
        List<String> possible_answers
) {
}
