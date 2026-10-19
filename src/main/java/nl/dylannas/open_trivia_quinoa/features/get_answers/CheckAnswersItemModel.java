package nl.dylannas.open_trivia_quinoa.features.get_answers;

import java.util.UUID;

public record CheckAnswersItemModel(
        UUID id,
        String question,
        String correct_answer
) {
}
