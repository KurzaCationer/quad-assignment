package nl.dylannas.open_trivia_quinoa.features.get_categories;

import jakarta.validation.constraints.NotNull;

public record GetCategoriesItemModel(
        @NotNull
        int id,
        @NotNull
        String name
) {
}
