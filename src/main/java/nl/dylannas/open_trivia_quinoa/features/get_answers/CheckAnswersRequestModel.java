package nl.dylannas.open_trivia_quinoa.features.get_answers;

import org.jboss.resteasy.reactive.RestQuery;

import java.util.List;
import java.util.UUID;

public record CheckAnswersRequestModel(
        List<UUID> question_ids
) {
}