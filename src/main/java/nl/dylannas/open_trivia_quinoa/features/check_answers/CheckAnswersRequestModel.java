package nl.dylannas.open_trivia_quinoa.features.check_answers;

import java.util.List;
import java.util.UUID;

public record CheckAnswersRequestModel(
        List<UUID> question_ids
) {
}