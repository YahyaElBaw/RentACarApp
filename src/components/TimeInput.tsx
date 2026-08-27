import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';

const ACCENT = '#4F39F6';
const BORDER = '#F1F5F9';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#94A3B8';

interface TimeInputProps {
  label?: string;
  value: string;
  onChange: (timeStr: string) => void;
  style?: any;
}

export default function TimeInput({ label, value, onChange, style }: TimeInputProps) {
  const [show, setShow] = useState(false);

  const [hours, minutes] = (value || '08:00').split(':').map(Number);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      const h = String(selected.getHours()).padStart(2, '0');
      const m = String(selected.getMinutes()).padStart(2, '0');
      onChange(`${h}:${m}`);
    }
  };

  const pickerDate = new Date();
  pickerDate.setHours(hours || 8, minutes || 0, 0, 0);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        activeOpacity={0.7}
        style={[
          {
            height: 52,
            backgroundColor: BG,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          style,
        ]}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: value ? TEXT : '#CBD5E1',
          }}
        >
          {value || 'HH:MM'}
        </Text>
        <Clock size={16} color={MUTED} />
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide">
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShow(false)}
          >
            <View
              style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: 40,
              }}
              onStartShouldSetResponder={() => true}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER }}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>Annuler</Text>
                </TouchableOpacity>
                {label && <Text style={{ fontSize: 11, fontWeight: '900', color: TEXT, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>}
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: ACCENT }}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                onChange={handleChange}
                themeVariant="light"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="default"
            onChange={handleChange}
          />
        )
      )}
    </>
  );
}
