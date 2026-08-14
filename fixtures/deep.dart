// 들여쓰기 기반 판정이 언어를 가리지 않는지 확인하는 픽스처.
// Flutter의 위젯 중첩은 이 익스텐션의 핵심 사용처다.

Widget build(BuildContext context) {
  return Scaffold(
    body: SafeArea(
      child: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.all(8),
                  child: Card(
                    child: ListTile(
                      title: Text('item $index'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}
