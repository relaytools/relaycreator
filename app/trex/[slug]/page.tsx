import Posts from '../../posts/page';
import { FaDragon } from 'react-icons/fa';

export default async function TrexPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params;
    
    return (
        <Posts relayName={slug} />
    );
}