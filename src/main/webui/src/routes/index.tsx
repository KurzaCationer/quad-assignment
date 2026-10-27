import {createFileRoute, useRouter, useRouterState} from '@tanstack/react-router'
import {errorMessage, requireSuccess} from '@/lib/apiErrors';
import {getApiGetCategories} from "@/generated/get-categories-endpoint/get-categories-endpoint";
import {getApiGetQuestions} from "@/generated/get-questions-endpoint/get-questions-endpoint";
import {zodValidator} from '@tanstack/zod-adapter'
import {z} from 'zod'
import {QuestionDifficulty, QuestionType} from "@/generated/api.schemas.ts";
import {useQuizFilters} from "@/hooks/useQuizFilters.ts";
import {useQuizAnswers} from "@/hooks/useQuizAnswers.ts";
import {Button} from "@/components/ui/button.tsx";
import {Alert, AlertAction, AlertDescription, AlertTitle} from "@/components/ui/alert.tsx";
import {CircleAlertIcon} from "lucide-react";
import {Spinner} from "@/components/ui/spinner.tsx";
import QuizScore from "@/components/QuizScore.tsx";
import CustomSelect from "@/components/CustomSelect.tsx";
import Question from "@/components/Question.tsx";

const questionsPageStateSchema = z.object({
    shouldFetch: z.boolean().default(false),
    category: z.number().default(-1),
    difficulty: z.nativeEnum(QuestionDifficulty).default("EASY"),
    type: z.nativeEnum(QuestionType).default("MULTIPLE")
})

export const Route = createFileRoute('/')({
    component: Index,
    validateSearch: zodValidator(questionsPageStateSchema),
    staleTime: Infinity,
    loaderDeps: ({search}) => ({...search}),
    loader: async (ctx) => {
        const [categoriesResult, questionsResult] = await Promise.allSettled([
            getApiGetCategories().then(response => {
                const data = requireSuccess(response);
                if (!Array.isArray(data.categories)) throw new Error('Invalid categories response');
                return data.categories;
            }),
            ctx.deps.shouldFetch ? getApiGetQuestions({
                categoryId: ctx.deps.category,
                difficulty: ctx.deps.difficulty,
                type: ctx.deps.type,
                amount: 7
            }).then(response => {
                const data = requireSuccess(response);
                if (!Array.isArray(data.questions)) throw new Error('Invalid questions response');
                return data.questions;
            }) : Promise.resolve([]),
        ]);
        return {
            categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
            questions: questionsResult.status === 'fulfilled' ? questionsResult.value : [],
            categoriesError: categoriesResult.status === 'rejected'
                ? errorMessage(categoriesResult.reason, 'Unable to load categories. Please try again.') : null,
            questionsError: questionsResult.status === 'rejected'
                ? errorMessage(questionsResult.reason, 'Unable to load questions. Please try again.') : null,
            fetchedAt: Date.now(),
        };
    }
})

function Index() {
    const {categories, questions, fetchedAt, categoriesError, questionsError} = Route.useLoaderData();
    const router = useRouter();
    const isLoading = useRouterState({select: state => state.isLoading});
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const answers = useQuizAnswers({questions, fetchedAt});
    const filters = useQuizFilters({search, navigate, onChange: answers.reset});

    const categorySelectItems = [{
        label: "No category",
        value: -1
    }, ...categories?.map(item => {
        return {label: item.name, value: item.id}
    }) ?? []];

    const difficultySelectItems = Object.values(QuestionDifficulty).map(val => (
        {
            label: val.charAt(0).toUpperCase() + val.slice(1).toLowerCase(),
            value: val
        }
    ));

    const typeSelectItems = Object.values(QuestionType).map(val => ({
        label: val === "MULTIPLE" ? "Multiple choice" : "True/False",
        value: val
    }));

    return (
        <div className="max-w-300 mx-auto px-4 py-4 sm:px-6">
            <div className={"flex flex-wrap gap-2 items-center"}>
                <h1 className={"font-heading text-3xl font-semibold"}>Questions</h1>
                <div className={"flex w-full min-w-0 flex-wrap gap-2 items-center sm:w-auto"}>
                    <Button className={"px-6 py-4 w-20"} onClick={filters.toggleShouldFetch}>
                        {filters.shouldFetch ? "Stop" : "Start"}
                    </Button>
                    <CustomSelect
                        value={filters.category}
                        onValueChange={(value) => filters.setSearchParameter("category", prev => value ?? prev)}
                        items={categorySelectItems}
                        label={"Categories"}
                    />
                    <CustomSelect
                        value={filters.difficulty}
                        onValueChange={(value) => filters.setSearchParameter("difficulty", prev => value ?? prev)}
                        items={difficultySelectItems}
                        label={"Difficulty"}
                    />
                    <CustomSelect
                        value={filters.type}
                        onValueChange={(value) => filters.setSearchParameter("type", prev => value ?? prev)}
                        items={typeSelectItems}
                        label={"Type"}
                    />
                    {filters.isChanging && <Spinner className="shrink-0"/>}
                </div>
            </div>
            {(categoriesError || questionsError) && (
                <Alert variant="destructive" className="mt-4">
                    <CircleAlertIcon/>
                    <AlertTitle>Unable to load quiz data</AlertTitle>
                    <AlertDescription>
                        {categoriesError && <p>{categoriesError}</p>}
                        {questionsError && <p>{questionsError}</p>}
                        <Button className={"w-fit"} variant="outline" disabled={isLoading}
                                onClick={() => void router.invalidate()}>
                            {isLoading ? 'Retrying…' : 'Retry'}
                        </Button>
                    </AlertDescription>
                    <AlertAction>
                    </AlertAction>
                </Alert>
            )}
            <div className={"flex flex-col mt-4 gap-3"}>
                {questions?.map(q => (
                    <Question
                        key={q.id}
                        question={q}
                        givenAnswer={answers.given[q.id!]}
                        correctAnswer={answers.correct[q.id!]}
                        onAnswer={(answer) => answers.selectAnswer(q.id!, answer)}
                    />
                ))}
            </div>
            {(questions?.length ?? 0) > 0 &&
                <Button
                    disabled={answers.isSubmitDisabled}
                    className={"px-6 py-4 w-20 mt-4"}
                    onClick={answers.submit}>
                    {(answers.isSubmitting) ? (
                        <Spinner className="animate-spin"/>
                    ) : "Submit"}
                </Button>
            }

            {answers.error && (
                <Alert variant="destructive" className="mt-3">
                    <CircleAlertIcon/>
                    <AlertTitle>Unable to submit answers</AlertTitle>
                    <AlertDescription>
                        <p>{answers.error}</p>
                        <p>Your selections are saved. Submit again to retry.</p>
                    </AlertDescription>
                </Alert>
            )}
            {answers.score !== null && (
                <QuizScore score={answers.score} totals={answers.totals}/>
            )}
        </div>
    )
}
