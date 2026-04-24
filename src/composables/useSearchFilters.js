import { ref, computed } from 'vue';

export function useSearchFilters() {
    const filters = ref({
        type: 'All',
        genres: [],
        status: 'All',
        sort: 'Latest',
        rating: 0
    });

    const activeFiltersCount = computed(() => {
        let count = 0;
        if (filters.value.type !== 'All') count++;
        count += filters.value.genres.length;
        if (filters.value.status !== 'All') count++;
        if (filters.value.rating > 0) count++;
        return count;
    });

    const toggleGenre = (genre) => {
        const index = filters.value.genres.indexOf(genre);
        if (index > -1) {
            filters.value.genres.splice(index, 1);
        } else {
            filters.value.genres.push(genre);
        }
    };

    const clearFilters = () => {
        filters.value = {
            type: 'All',
            genres: [],
            status: 'All',
            sort: 'Latest',
            rating: 0
        };
    };

    const removeFilter = (key, value) => {
        if (key === 'genres') {
            toggleGenre(value);
        } else {
            filters.value[key] = 'All';
        }
    };

    return {
        filters,
        activeFiltersCount,
        toggleGenre,
        clearFilters,
        removeFilter
    };
}
