package nl.dylannas.open_trivia_quinoa.features.get_questions;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.ws.rs.DefaultValue;
import nl.dylannas.open_trivia_quinoa.models.QuestionDifficulty;
import nl.dylannas.open_trivia_quinoa.models.QuestionEncoding;
import nl.dylannas.open_trivia_quinoa.models.QuestionType;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.jboss.resteasy.reactive.RestQuery;

public record GetQuestionsRequestModel(
        @RestQuery @Min(5) @Max(20) @DefaultValue("10") int amount,
        @RestQuery @DefaultValue("-1") int categoryId,
        @RestQuery @DefaultValue("EASY") QuestionDifficulty difficulty,
        @RestQuery @DefaultValue("MULTIPLE") QuestionType type,
        @RestQuery QuestionEncoding encoding
) {
}
