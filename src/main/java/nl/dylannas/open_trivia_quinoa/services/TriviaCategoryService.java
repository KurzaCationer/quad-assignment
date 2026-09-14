package nl.dylannas.open_trivia_quinoa.services;

import io.quarkus.cache.CacheResult;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.OpenTriviaApiClient;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.CategoryDTO;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.GetCategoriesDTO;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.Objects;
import java.util.logging.Logger;

@ApplicationScoped
public class TriviaCategoryService {
    private static final Logger LOG = Logger.getLogger(String.valueOf(TriviaCategoryService.class));

    @RestClient
    OpenTriviaApiClient openTriviaApiClient;

    @CacheResult(cacheName = "service-categories")
    public Uni<GetCategoriesDTO> GetCategories() {
        Uni<RestResponse<GetCategoriesDTO>> apiResponse = openTriviaApiClient.getCategories();

        return apiResponse.map(RestResponse::getEntity);
    }

    public Uni<CategoryDTO> GetCategory(Integer id) {
        Uni<GetCategoriesDTO> categories = GetCategories();

        return categories
                .map(x ->
                        x.trivia_categories.stream()
                                .filter(y -> Objects.equals(y.id, id))
                                .findAny()
                                .orElse(null));
    }

    public Uni<Integer> GetCategoryId(String name) {
        Uni<GetCategoriesDTO> categories = GetCategories();

        return categories
                .map(x ->
                        x.trivia_categories.stream()
                                .filter(y -> Objects.equals(y.name, name))
                                .findAny()
                                .map(y -> y.id)
                                .orElse(null));
    }
}
