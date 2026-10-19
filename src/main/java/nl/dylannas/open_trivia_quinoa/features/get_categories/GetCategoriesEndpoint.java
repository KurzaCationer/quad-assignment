package nl.dylannas.open_trivia_quinoa.features.get_categories;

import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import nl.dylannas.open_trivia_quinoa.open_trivia_api_client.models.GetCategoriesDTO;
import nl.dylannas.open_trivia_quinoa.services.TriviaCategoryService;
import org.jboss.resteasy.reactive.RestResponse;

import java.util.logging.Logger;

@Path("get_categories")
public class GetCategoriesEndpoint {
    private static final Logger LOG = Logger.getLogger(String.valueOf(GetCategoriesEndpoint.class));

    @Inject
    TriviaCategoryService triviaCategoryService;

    @GET
    public Uni<RestResponse<GetCategoriesResponseModel>> GetCategories() {
        Uni<GetCategoriesDTO> categories = triviaCategoryService.GetCategories();

        return categories.map(x -> new GetCategoriesResponseModel(x.trivia_categories.stream()
                        .map(c -> new GetCategoriesItemModel(c.id, c.name))
                        .toList()))
                .map(RestResponse::ok);
    }
}
