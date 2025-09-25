import { Image, Page, Text, View } from '@react-pdf/renderer';

import type { AnnotationDetail } from '../types';
import { formatTimestamp } from '../utils';

interface VideoFramePageProps {
  frameData: string;
  annotation: AnnotationDetail;
  timestamp: number;
  pageNumber: number;
}

/**
 * Simple Video Frame PDF Page
 * KISS: Just show frame + annotation text
 */
export function VideoFramePage({ frameData, annotation, timestamp, pageNumber }: VideoFramePageProps) {
  return (
    <Page size="A4" style={{ padding: 20, fontSize: 12 }}>
      {/* Simple header */}
      <View style={{ marginBottom: 15, borderBottom: '1pt solid #ccc', paddingBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Frame at {formatTimestamp(timestamp)}</Text>
        <Text style={{ fontSize: 10, color: '#666', marginTop: 5 }}>Page {pageNumber}</Text>
      </View>

      {/* Frame image */}
      <View style={{ marginBottom: 15, textAlign: 'center' }}>
        <Image
          src={frameData}
          style={{
            maxWidth: '100%',
            maxHeight: 400,
            border: '1pt solid #ddd',
          }}
        />
      </View>

      {/* Annotation details */}
      <View style={{ marginTop: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Annotation Details:</Text>

        {/* Annotation text */}
        {annotation.text && (
          <View style={{ marginBottom: 8, padding: 8, backgroundColor: '#f9f9f9', border: '1pt solid #eee' }}>
            <Text style={{ fontSize: 12 }}>{annotation.text}</Text>
          </View>
        )}

        {/* Basic info */}
        <View style={{ flexDirection: 'row', marginTop: 8, fontSize: 10, color: '#666' }}>
          <Text style={{ marginRight: 15 }}>Type: {annotation.type || 'annotation'}</Text>
          <Text style={{ marginRight: 15 }}>Tool: {annotation.tool || 'rect'}</Text>
          {annotation.color && <Text>Color: {annotation.color}</Text>}
        </View>

        {/* Timestamp info */}
        <View style={{ marginTop: 8, fontSize: 10, color: '#666' }}>
          <Text>
            Timestamp: {formatTimestamp(annotation.start_at ?? 0)}
            {Boolean(annotation.end_at && annotation.end_at !== annotation.start_at) &&
              ` - ${formatTimestamp(annotation.end_at!)}`}
          </Text>
        </View>
      </View>
    </Page>
  );
}
