package nl.dylannas.open_trivia_quinoa.features.check_answers;

import java.util.UUID;

public record CheckAnswersItemModel(
        UUID id,
        String question,
        String correct_answer
) {
}
