import { Document, Image, Page, Text, View } from '@react-pdf/renderer';

import type { AnnotationDetail } from '../types';
import { formatTimestamp } from '../utils';

interface SimpleVideoDocumentProps {
  frames: Array<{
    timestamp: number;
    frameData: string;
    annotation: AnnotationDetail;
  }>;
}

/**
 * Super Simple Video PDF Document
 * KISS: Just show frames with annotations - nothing fancy
 */
export function SimpleVideoDocument({ frames }: SimpleVideoDocumentProps) {
  if (frames.length === 0) {
    return (
      <Document>
        <Page size="A4" style={{ padding: 20 }}>
          <Text>No video frames found</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      {frames.map((frame, index) => (
        <Page key={frame.timestamp} size="A4" style={{ padding: 20, fontSize: 12 }}>
          {/* Simple header */}
          <View style={{ marginBottom: 15, borderBottom: '1pt solid #ccc', paddingBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Frame at {formatTimestamp(frame.timestamp)}</Text>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 5 }}>
              Page {index + 1} of {frames.length}
            </Text>
          </View>

          {/* Frame image */}
          <View style={{ marginBottom: 15, textAlign: 'center' }}>
            <Image
              src={frame.frameData}
              style={{
                maxWidth: '100%',
                maxHeight: 400,
                border: '1pt solid #ddd',
              }}
            />
          </View>

          {/* Annotation text */}
          {frame.annotation.text && (
            <View
              style={{
                marginTop: 10,
                padding: 10,
                backgroundColor: '#f9f9f9',
                border: '1pt solid #eee',
              }}
            >
              <Text style={{ fontSize: 12 }}>{frame.annotation.text}</Text>
            </View>
          )}

          {/* Simple footer */}
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              left: 20,
              right: 20,
              fontSize: 8,
              color: '#666',
              borderTop: '1pt solid #eee',
              paddingTop: 5,
            }}
          >
            <Text>Video Annotation - Generated on {new Date().toLocaleDateString()}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
