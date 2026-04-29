import TimerBar from '@/Components/Timer/TimerBar';
import EntryList from '@/Components/Timer/EntryList';
import { useEntries } from '@/lib/queries/entries';
import withAuth from '@/hoc/withAuth';
import Loading from '@/Components/Loading';
import { startOfWeek, endOfDay } from 'date-fns';

function TrackerPage() {
    const from = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const to = endOfDay(new Date()).toISOString();

    const { data: entries, isLoading } = useEntries({ from, to });

    return (
        <>
            <TimerBar />
            <div style={{ marginTop: 20 }}>
                {isLoading ? (
                    <Loading height={200} />
                ) : (
                    <EntryList entries={entries || []} />
                )}
            </div>
        </>
    );
}

export default withAuth(TrackerPage);
