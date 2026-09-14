package nl.dylannas.open_trivia_quinoa.features.get_categories;

import java.util.List;

public record GetCategoriesResponseModel(
        List<GetCategoriesItemModel> categories
) {
}
