all:

yml=Czarnecki_Michal_gr_pr_1_.yml

zip: doc.yaml
	cp $^ $(yml)
	unix2dos $(yml)
	zip -r CZARNECKI_MICHAŁ_GR_PR_1_DOK.zip $(yml)
	rm $(yml)

clean:
	rm -rf $(yml) *.zip

