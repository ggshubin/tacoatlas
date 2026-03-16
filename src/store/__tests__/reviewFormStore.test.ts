import { useReviewFormStore } from '../reviewFormStore'

beforeEach(() => useReviewFormStore.getState().reset())

describe('reviewFormStore', () => {
  it('starts at step 1', () => {
    expect(useReviewFormStore.getState().currentStep).toBe(1)
  })

  it('nextStep increments step', () => {
    useReviewFormStore.getState().nextStep()
    expect(useReviewFormStore.getState().currentStep).toBe(2)
  })

  it('prevStep does not go below 1', () => {
    useReviewFormStore.getState().prevStep()
    expect(useReviewFormStore.getState().currentStep).toBe(1)
  })

  it('nextStep does not exceed 5', () => {
    const store = useReviewFormStore.getState()
    for (let i = 0; i < 10; i++) store.nextStep()
    expect(useReviewFormStore.getState().currentStep).toBe(5)
  })

  it('toggleCondiment adds condiment', () => {
    useReviewFormStore.getState().toggleCondiment('cilantro')
    expect(useReviewFormStore.getState().condiments).toContain('cilantro')
  })

  it('toggleCondiment removes condiment if already present', () => {
    useReviewFormStore.getState().toggleCondiment('cilantro')
    useReviewFormStore.getState().toggleCondiment('cilantro')
    expect(useReviewFormStore.getState().condiments).not.toContain('cilantro')
  })

  it('addTacoEntry appends entry', () => {
    useReviewFormStore.getState().addTacoEntry({ tacoType: 'Al Pastor', rating: 5, notes: null })
    expect(useReviewFormStore.getState().tacoEntries).toHaveLength(1)
  })

  it('removeTacoEntry removes by index', () => {
    const store = useReviewFormStore.getState()
    store.addTacoEntry({ tacoType: 'Al Pastor', rating: 5, notes: null })
    store.addTacoEntry({ tacoType: 'Birria', rating: 4, notes: null })
    store.removeTacoEntry(0)
    expect(useReviewFormStore.getState().tacoEntries).toHaveLength(1)
    expect(useReviewFormStore.getState().tacoEntries[0].tacoType).toBe('Birria')
  })

  it('reset restores initial state', () => {
    const store = useReviewFormStore.getState()
    store.nextStep()
    store.addTacoEntry({ tacoType: 'Al Pastor', rating: 5, notes: null })
    store.reset()
    const state = useReviewFormStore.getState()
    expect(state.currentStep).toBe(1)
    expect(state.tacoEntries).toHaveLength(0)
  })
})
