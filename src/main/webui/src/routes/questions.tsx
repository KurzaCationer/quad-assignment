import {createFileRoute} from '@tanstack/react-router'
import {getApiGetCategories, getApiGetQuestions} from "@/generated";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "../components/ui/select";
import {Button} from "@/components/ui/button.tsx";
import {zodValidator} from '@tanstack/zod-adapter'
import {z} from 'zod'

const questionsPageStateSchema = z.object({
    shouldFetch: z.boolean().default(false),
    category: z.number().default(-1),
})

export const Route = createFileRoute('/questions')({
    component: Index,
    validateSearch: zodValidator(questionsPageStateSchema),
    loaderDeps: ({search: {shouldFetch, category}}) => ({fetchQuestions: shouldFetch, selectedCategory: category}),
    loader: {
        handler: async (ctx) => ({
            categories: await getApiGetCategories().then(x => x.data.categories),
            questions: ctx.deps.fetchQuestions ? await getApiGetQuestions({categoryId: ctx.deps.selectedCategory}) : null,
        }),
        staleReloadMode: "background"
    }
})

function Index() {
    const {categories, questions} = Route.useLoaderData();
    const {category, shouldFetch} = Route.useSearch();
    const navigate = Route.useNavigate()

    const categorySelectItems = [{
        label: "No category",
        value: -1
    }, ...categories?.map(item => {
        return {label: item.name, value: item.id}
    }) ?? []];

    // const checkAnswersMutation = usePostApiCheckAnswers({
    //
    // });


    return (
        <div className="p-2">
            <Button onClick={async () => {
                await navigate({
                    search: (prev) => ({
                        ...prev,
                        shouldFetch: !prev.shouldFetch,
                    })
                })
            }}>
                {shouldFetch ? "Cancel" : "Start"}
            </Button>
            <Select value={category} onValueChange={async (value) => {
                await navigate({
                    search: (prev) => ({
                        ...prev,
                        category: value ?? prev.category,
                    })
                })
            }}
                    items={categorySelectItems}>
                <SelectTrigger className="w-65">
                    <SelectValue/>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Categories</SelectLabel>
                        {categorySelectItems.map(item =>
                            (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))
                        }
                    </SelectGroup>
                </SelectContent>
                <p>
                    {JSON.stringify(questions?.data.questions)}
                </p>
            </Select>
        </div>
    )
}