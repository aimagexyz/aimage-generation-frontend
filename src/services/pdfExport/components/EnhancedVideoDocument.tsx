import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { AnnotationDetail } from '../types';
import { formatDate, formatTimestamp } from '../utils';
import { getJapaneseFontFamily, initializeFonts } from './fonts';

// Initialize Japanese fonts
initializeFonts();

interface EnhancedVideoDocumentProps {
  frames: Array<{
    timestamp: number;
    frameData: string;
    annotation: AnnotationDetail;
  }>;
  videoUrl?: string;
  taskInfo?: {
    name?: string;
    id?: string;
  };
}

/**
 * Professional Video PDF Document
 * Enterprise-grade design with proper branding and typography
 */

// Get Japanese font family for PDF
const japaneseFontFamily: string = getJapaneseFontFamily();

// Modern Professional Design System
const styles = StyleSheet.create({
  // Page Layout - Clean and spacious
  page: {
    fontFamily: japaneseFontFamily,
    fontSize: 11,
    padding: 50,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },

  // Modern Header with minimal design
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 15,
    borderBottom: '1 solid #e0e0e0',
  },

  logoSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  logo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a5568',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  reportTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },

  reportSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },

  headerMeta: {
    textAlign: 'right',
    fontSize: 9,
    color: '#94a3b8',
    lineHeight: 1.5,
  },

  // Modern Content Card
  videoInfoSection: {
    backgroundColor: '#f8fafc',
    padding: 20,
    marginBottom: 25,
    borderRadius: 6,
    borderLeft: '3 solid #3b82f6',
  },

  videoInfoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  videoMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },

  videoMetaItem: {
    marginBottom: 4,
    fontSize: 11,
    color: '#4b5563',
  },

  videoMetaLabel: {
    fontWeight: 'bold',
    color: '#374151',
  },

  // Modern Frame Card
  frameSection: {
    marginBottom: 35,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1 solid #e2e8f0',
  },

  frameSectionHeader: {
    backgroundColor: '#f8fafc',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1 solid #e2e8f0',
  },

  frameTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },

  frameTimestamp: {
    fontSize: 11,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    padding: '5 12',
    borderRadius: 20,
    fontWeight: '500',
  },

  frameContent: {
    padding: 16,
  },

  // Clean Image Display
  frameImageContainer: {
    margin: 20,
    textAlign: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 2,
  },

  frameImage: {
    maxWidth: '100%',
    maxHeight: 320,
    objectFit: 'contain',
    borderRadius: 6,
  },

  // Annotation Content
  annotationSection: {
    backgroundColor: '#fef7f0',
    border: '1 solid #fed7aa',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },

  annotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  annotationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ea580c',
  },

  annotationType: {
    fontSize: 10,
    backgroundColor: '#fed7aa',
    color: '#9a3412',
    padding: '2 6',
    borderRadius: 3,
  },

  annotationText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#1f2937',
    fontWeight: '500',
    marginBottom: 8,
  },

  annotationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#6b7280',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1 solid #fed7aa',
  },

  // Minimal Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTop: '0.5 solid #e2e8f0',
    fontSize: 9,
    color: '#94a3b8',
  },

  // Modern Badge Style
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: '8 16',
    borderRadius: 6,
    marginBottom: 20,
    borderLeft: '3 solid #3b82f6',
  },

  summaryBadgeText: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // New styles for enhanced features section
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statCard: {
    alignItems: 'center',
    margin: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
  },
  featuresSection: {
    backgroundColor: '#f0f9eb',
    border: '1 solid #66bb6a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  featuresList: {
    fontSize: 11,
    color: '#424242',
  },
  featureItem: {
    marginBottom: 4,
  },
  annotationMetadata: {
    marginTop: 8,
  },
  overlayDetailsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1 solid #e5e7eb',
  },
  overlayDetailsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  overlayDetail: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 2,
  },
});

export function EnhancedVideoDocument({ frames, videoUrl, taskInfo }: EnhancedVideoDocumentProps) {
  if (frames.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.reportTitle}>No Video Frames Available</Text>
          </View>
          <Text>No annotations with video frames were found.</Text>
        </Page>
      </Document>
    );
  }

  const getVideoFileName = (url?: string): string => {
    if (!url) {
      return 'Unknown Video';
    }
    return url.split('/').pop()?.split('?')[0] || 'video.mp4';
  };

  // Modern Summary page with better typography
  function SummaryPage() {
    return (
      <Page size="A4" style={styles.page}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>VIDEO ANALYSIS REPORT</Text>
            <Text style={styles.reportTitle}>Annotation Summary</Text>
            <Text style={styles.reportSubtitle}>{taskInfo?.name || 'Video Frame Analysis'}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>{formatDate(new Date().toISOString())}</Text>
            <Text>ID: {taskInfo?.id?.slice(0, 8) || 'N/A'}</Text>
            <Text>{frames.length} Annotations</Text>
          </View>
        </View>

        {/* Statistics Overview */}
        <View style={styles.videoInfoSection}>
          <Text style={styles.videoInfoTitle}>Overview Statistics</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#3b82f6' }}>{frames.length}</Text>
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Total Annotations</Text>
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>
                {getVideoFileName(videoUrl).slice(0, 20)}
              </Text>
              <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>Video File</Text>
            </View>
          </View>
        </View>

        {/* Annotation Timeline */}
        <View style={{ marginTop: 25 }}>
          <Text style={[styles.videoInfoTitle, { marginBottom: 15 }]}>Annotation Timeline</Text>

          {frames.map((frame, index) => (
            <View
              key={frame.timestamp}
              style={{
                flexDirection: 'row',
                marginBottom: 10,
                alignItems: 'flex-start',
                backgroundColor: '#ffffff',
                padding: 12,
                borderRadius: 6,
                borderLeft: '3 solid #3b82f6',
                border: '1 solid #e2e8f0',
              }}
            >
              <View style={{ width: 70, marginRight: 15 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3b82f6' }}>
                  {formatTimestamp(frame.timestamp)}
                </Text>
                <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 2 }}>Frame {index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#1e293b', lineHeight: 1.5 }}>
                  {frame.annotation.text || 'No description provided'}
                </Text>
              </View>
              <View style={{ width: 50, alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 9,
                    color: '#64748b',
                    backgroundColor: '#f1f5f9',
                    padding: '3 8',
                    borderRadius: 10,
                  }}
                >
                  P. {index + 2}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>© AI Mage Review System</Text>
          <Text style={{ fontWeight: 'bold' }}>1 / {frames.length + 1}</Text>
        </View>
      </Page>
    );
  }

  // Modern Frame pages with clean design
  const FramePages = () =>
    frames.map((frame, index) => (
      <Page key={frame.timestamp} size="A4" style={styles.page}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>FRAME ANALYSIS</Text>
            <Text style={styles.reportTitle}>
              Annotation {index + 1} of {frames.length}
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>{getVideoFileName(videoUrl).slice(0, 30)}</Text>
            <Text>Timestamp: {formatTimestamp(frame.timestamp)}</Text>
          </View>
        </View>

        {/* Modern Frame Card */}
        <View style={styles.frameSection}>
          <View style={styles.frameSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#3b82f6',
                  marginRight: 10,
                }}
              />
              <Text style={styles.frameTitle}>Frame at {formatTimestamp(frame.timestamp)}</Text>
            </View>
            <Text style={styles.frameTimestamp}>{formatTimestamp(frame.timestamp)}</Text>
          </View>

          {/* Clean Image Display */}
          <View style={styles.frameImageContainer}>
            <Image src={frame.frameData} style={styles.frameImage} />
          </View>

          {/* Annotation Details if available */}
          {frame.annotation.text && (
            <View
              style={{
                margin: 20,
                padding: 15,
                backgroundColor: '#f8fafc',
                borderRadius: 6,
                borderLeft: '3 solid #64748b',
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: 'bold',
                  color: '#475569',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Annotation Details
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: '#1e293b',
                  lineHeight: 1.6,
                }}
              >
                {frame.annotation.text}
              </Text>
            </View>
          )}
        </View>

        {/* Page indicator */}
        <View
          style={{
            marginTop: 20,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {Array.from({ length: Math.min(frames.length + 1, 5) }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index + 1 ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: i === index + 1 ? '#3b82f6' : '#e2e8f0',
                }}
              />
            ))}
          </View>
        </View>

        {/* Minimal Footer */}
        <View style={styles.footer}>
          <Text>© AI Mage Review System</Text>
          <Text style={{ fontWeight: 'bold' }}>
            {index + 2} / {frames.length + 1}
          </Text>
        </View>
      </Page>
    ));

  return (
    <Document>
      <SummaryPage />
      <FramePages />
    </Document>
  );
}
