import {createFileRoute} from '@tanstack/react-router'
import {getApiGetCategories, getApiGetQuestions, usePostApiCheckAnswers} from "@/generated";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {Button, buttonVariants} from "@/components/ui/button.tsx";
import {zodValidator} from '@tanstack/zod-adapter'
import {z} from 'zod'
import {useEffect, useState} from "react";
import type {VariantProps} from "class-variance-authority";
import QuizScore from "@/components/QuizScore.tsx";
import {Spinner} from "@/components/ui/spinner.tsx";

const questionsPageStateSchema = z.object({
    shouldFetch: z.boolean().default(false),
    category: z.number().default(-1),
})

export const Route = createFileRoute('/')({
    component: Index,
    validateSearch: zodValidator(questionsPageStateSchema),
    staleTime: Infinity,
    loaderDeps: ({search: {shouldFetch, category}}) => ({fetchQuestions: shouldFetch, selectedCategory: category}),
    loader: async (ctx) => ({
        categories: await getApiGetCategories().then(x => x.data.categories),
        questions: ctx.deps.fetchQuestions ? await getApiGetQuestions({
            categoryId: ctx.deps.selectedCategory,
            amount: 7
        }).then(x => x.data.questions) : [],
        fetchedAt: Date.now(),
    })
})

function Index() {
    const {categories, questions, fetchedAt: fetchedAtLoader} = Route.useLoaderData();
    const {category, shouldFetch} = Route.useSearch();
    const navigate = Route.useNavigate();

    const [fetchedAt, setFetchedAt] = useState(fetchedAtLoader)
    const [categoryDisplay, setCategoryDisplay] = useState(category);
    const [shouldFetchDisplay, setShouldFetchDisplay] = useState(shouldFetch);

    const [givenAnswers, setGivenAnswers] = useState<{ [id: string]: string }>({});
    const [correctAnswers, setCorrectAnswers] = useState<{ [id: string]: string }>({});

    const answerEntries = Object.entries(givenAnswers);
    const correctAnswerEntries = Object.entries(correctAnswers);

    const totals = {
        questions: questions?.length ?? 0,
        answeredQuestions: Object.keys(correctAnswers).length,
        correctlyAnsweredQuestions: correctAnswerEntries.filter(ca => answerEntries.some(a => {
            return ca[0] === a[0] && ca[1] === a[1];
        })).length
    };

    const score = totals.answeredQuestions > 0 ? {
        percentageCorrectlyAnswered: totals.correctlyAnsweredQuestions / totals.answeredQuestions * 100
    } : null;

    const categorySelectItems = [{
        label: "No category",
        value: -1
    }, ...categories?.map(item => {
        return {label: item.name, value: item.id}
    }) ?? []];

    const checkAnswersMutation = usePostApiCheckAnswers({});

    const resetState = () => {
        setGivenAnswers({});
        setCorrectAnswers({});
    };

    const toggleShouldFetch = async () => {
        resetState()

        setShouldFetchDisplay(prev => !prev);
        await navigate({
            search: (prev) => ({
                ...prev,
                shouldFetch: !prev.shouldFetch,
            })
        })
    }

    const setCategory = async (value: number | null) => {
        resetState();

        setCategoryDisplay(prev => value ?? prev);
        await navigate({
            search: (prev) => ({
                ...prev,
                category: value ?? prev.category,
            })
        });
    };

    //Reset state when route loader updates the questions
    useEffect(() => {
        if (fetchedAt !== fetchedAtLoader) {
            resetState();
            setFetchedAt(fetchedAtLoader)
        }
    }, [fetchedAt, fetchedAtLoader]);

    const submit = async () => {
        const response = await checkAnswersMutation.mutateAsync({data: {question_ids: Object.keys(givenAnswers)}});

        let newAnswers = {};
        newAnswers = response?.data!.answers?.filter(a => a.id !== undefined).reduce((prev, current) => ({
            ...prev,
            [current.id!]: current.correct_answer
        }), newAnswers) ?? {};
        setCorrectAnswers(newAnswers);
    };

    return (
        <div className="max-w-300 mx-auto">
            <div className={"flex mt-4 gap-2 items-center"}>
                <h1 className={"font-heading text-3xl font-semibold"}>Questions</h1>
                <div className={"flex gap-2 items-center"}>
                    <Button className={"px-6 py-4 w-20"} onClick={toggleShouldFetch}>
                        {shouldFetchDisplay ? "Stop" : "Start"}
                    </Button>
                    <Select value={categoryDisplay} onValueChange={setCategory}
                            items={categorySelectItems}>
                        <SelectTrigger className={"w-65 h-8"}>
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
                    </Select>
                    {category !== categoryDisplay || shouldFetch !== shouldFetchDisplay && <Spinner/>}
                </div>
            </div>
            <div className={"flex flex-col mt-4 gap-3"}>
                {questions?.map(q => (
                    <div className={"flex flex-col gap-2"} key={q.id}>
                        <div dangerouslySetInnerHTML={{__html: q.question ?? ""}}
                             className={"bg-primary/10 p-2 rounded-sm"}/>
                        <div className={"flex flex-wrap gap-2"}>
                            {q.possible_answers?.map((answer, index) => {
                                const givenAnswer = givenAnswers[q.id!] === answer;
                                const correctAnswer = correctAnswers[q.id!] === answer;

                                let variantProps: VariantProps<typeof buttonVariants> = {
                                    variant: correctAnswer ? "confirmative" : givenAnswer ? "default" : "outline",
                                    size: "lg"
                                }
                                return (
                                    <Button key={index} {...variantProps}
                                            onClick={() => {
                                                setGivenAnswers((oldAnswers) => ({
                                                    ...oldAnswers,
                                                    [q.id!]: answer
                                                }));
                                            }}
                                            disabled={correctAnswers[q.id!] !== undefined}
                                            className={"py-4 text-center"}
                                            dangerouslySetInnerHTML={{__html: answer ?? ""}}/>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            {(questions?.length ?? 0) > 0 &&
                <Button
                    disabled={checkAnswersMutation.isPending || correctAnswerEntries.length >= (questions?.length ?? 10)}
                    className={"px-6 py-4 w-20 mt-4"}
                    onClick={submit}>
                    {(checkAnswersMutation.isPending) ? (
                        <Spinner className="animate-spin"/>
                    ) : "Submit"}
                </Button>
            }

            {score !== null && (
                <QuizScore score={score} totals={totals}/>
            )}
        </div>
    )
}